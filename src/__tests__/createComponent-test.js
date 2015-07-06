import { createComponent, funcSubject } from '../';
import React from 'react/addons';
import { Observable } from 'rx';
import jsdom from './jsdom';
import sinon from 'sinon';

const { TestUtils } = React.addons;

function createSmartButton(render) {
  return createComponent((props$ => {
    const increment$ = funcSubject();
    const count$ = increment$
      .startWith(0)
      .scan(total => total + 1);

    return Observable.combineLatest(props$, count$, (props, count) => ({
      ...props,
      onClick: increment$,
      count
    }));
  }), render);
}

function testSmartButton(element) {
  const tree = TestUtils.renderIntoDocument(element);
  const button = TestUtils.findRenderedDOMComponentWithTag(tree, 'button');

  TestUtils.Simulate.click(button);
  TestUtils.Simulate.click(button);
  TestUtils.Simulate.click(button);

  expect(button.props.count).to.equal(3);
  expect(button.props.pass).to.equal('through');
}

describe('createComponent', () => {
  jsdom();

  it('creates a smart React component by transforming a stream of props', () => {
    const SmartButton = createSmartButton(props => <button {...props} />);
    testSmartButton(<SmartButton pass="through" />);
  });

  it('does not render initial props twice', () => {
    const spy = sinon.spy();
    const SmartButton = createSmartButton(props => {
      spy(props.count);
      return <button {...props} />;
    });
    testSmartButton(<SmartButton pass="through" />);
    expect(spy.args.map(args => args[0])).to.deep.equal([0, 1, 2, 3]);
  });

  it('works on initial render', () => {
    const SmartButton = createSmartButton(props => <button {...props} />);

    // Test using shallow renderer, which only renders once
    const renderer = TestUtils.createRenderer();
    renderer.render(<SmartButton pass="through" />);
    const button = renderer.getRenderOutput();
    expect(button.props.pass).to.equal('through');
    expect(button.props.count).to.equal(0);
  });

  it('resulting component uses this.props.children as render function if none passed', () => {
    const SmartButton = createSmartButton();
    testSmartButton(
      <SmartButton pass="through">
        {props => <button {...props} />}
      </SmartButton>
    );
  });
});

describe('funcSubject()', () => {
  it('creates an observable function that pushes new values when called', () => {
    const v$ = funcSubject();
    const spy = sinon.spy();
    const s = v$.subscribe(spy);

    v$(1);
    v$(2);
    v$(3);

    s.dispose();
    expect(spy.args.map(args => args[0])).to.deep.equal([1, 2, 3]);
  });
});